from flask import render_template, redirect, url_for, request, flash, current_app as app
from flask_login import login_required, current_user
from sqlalchemy.exc import IntegrityError

import uuid, os, random, re, dateparser, datetime, string, unidecode

from . import customer_bp, docreco
from .models import Customer
from app.models import Customer_Dwelling_Contract, Contract, Invoice, Company, Dwelling


ALLOWED_EXTENSIONS = set(['txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'])


@customer_bp.route("/my-bills", methods=["GET", "POST"])
@login_required
def my_bills():
	customer = None
	contracts = None
	contract_invoices = None
	if current_user.user_type == 1:
		customer = Customer.get_by_user_id(current_user.id)
		customers_dwellings_contracts = Customer_Dwelling_Contract.get_by_nif(customer.nif)
		contracts = []
		for customer_dwelling_contract in customers_dwellings_contracts:
			contracts.append(Contract.get_by_contract_number(customer_dwelling_contract.contract_number))
		contract_invoices = {}
		for contract in contracts:
			contract_invoices[contract] = Invoice.get_by_contract_number(contract.contract_number)
	return render_template("bills/my_bills.html", contracts=contracts, contract_invoices=contract_invoices)


@customer_bp.route("/my-bills/show-bill/<string:invoice_number>")
@login_required
def show_bill(invoice_number):
	invoice = Invoice.get_by_invoice_number(invoice_number)
	return render_template("bills/show_bill.html", invoice=invoice)


@customer_bp.route("/my-bills/delete/<string:invoice_number>")
@login_required
def delete_bill(invoice_number):
	invoice = Invoice.get_by_invoice_number(invoice_number)
	invoice.delete()
	return redirect(url_for("customer.my_bills"))


@customer_bp.route("/upload-bill")
@login_required
def upload_bill():
	return render_template("bills/upload_bill.html")


@customer_bp.route("/process_bill", methods=["POST"])
def process_bill():
	if request.method == "POST":

		file = request.files["inputFile"]

		if not file.filename:
			flash("No se ha seleccionado ningún archivo")
			return redirect(url_for("customer.upload_bill"))

		if file and __allowed_file(file.filename):

			# save file to upload directory with a hash code
			file_extension = file.filename.rsplit(".", 1)[1].lower()
			filename = str(uuid.uuid4()) + "." + file_extension

			bill_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
			file.save(bill_path)

			# information extraction from the bill
			results = docreco.process_bill(bill_path, file_extension)

			# return results

			# Delete the bill uploaded
			os.remove(bill_path)

			contract_number = __get_first_value(results["Datos del contrato"]["ReferenciaContrato"]) \
								.split('/')[0] \
								.split('-')[0] \
								.split(' ')[0]

			if contract_number:
				contract = Contract.get_by_contract_number(contract_number)
				if not contract:
					company_name = __get_first_value(results["Datos de la factura"]["Comercializadora"])
					if company_name:
						trading_company = Company.get_trading_company_by_name(
							company_name,
							unidecode.unidecode(company_name)
						)
						if trading_company:
							cif = trading_company.cif
						else:
							flash("No se encuentra la comercializadora ni existe cif en la factura")
							return redirect(url_for("customer.my_bills"))
					else:
						flash("No se encuentra el nombre de la comercializadora en la factura")
						return redirect(url_for("customer.my_bills"))


					contract_data = __get_contract_data(results)
					contract = Contract(
						contract_number=contract_number,
						contracted_power=contract_data["contracted_power"],
						toll_access=contract_data["toll_access"],
						end_date=contract_data["end_date"],
						CNAE=contract_data["CNAE"],
						tariff_access=contract_data["tariff_access"],
						cif=cif
					)
					contract.save()
			else:
				flash("No se encuentra el número de referencia del contrato")
				return redirect(url_for("customer.my_bills"))

			invoice_data = __get_invoice_data(results, contract_number)

			invoice = Invoice(
				invoice_number=invoice_data["invoice_number"],
				contracted_power_amount=invoice_data["contracted_power_amount"],
				consumed_energy_amount=invoice_data["consumed_energy_amount"],
				issue_date=invoice_data["issue_date"],
				charge_date=invoice_data["charge_date"],
				init_date=invoice_data["init_date"],
				end_date=invoice_data["end_date"],
				total_amount=invoice_data["total_amount"],
				contract_reference=invoice_data["contract_reference"],
				contract_number=invoice_data["contract_number"],
				document=file.read()
			)

			try:
				invoice.save()
			except IntegrityError:
				flash("Esta factura ya está registrada")
				return redirect(url_for("customer.my_bills"))

			cups = __get_first_value(results["Datos del contrato"]["CUPS"])

			if cups and not Dwelling.get_by_cups(cups):
				__create_dwelling_with_cups(results, cups)
			else:
				cups = __create_dwelling_with_random_cups(results)

			customer_dwelling_contract = Customer_Dwelling_Contract(
				nif=Customer.get_by_user_id(current_user.id).nif,
				cups=cups,
				contract_number=contract_number
			)
			customer_dwelling_contract.save()

			flash("La factura se ha guardado con éxito")
			return redirect(url_for("customer.show_bill", invoice_number=invoice.invoice_number))

		else:
			flash("Los tipos de fichero permitidos son txt, pdf, png, jpg, jpeg, gif")
			return redirect(url_for("customer.upload_bill"))
		
	return "Error POST"


@customer_bp.route("/my_stats")
@login_required
def my_stats():
	return render_template("/my_stats.html")


@customer_bp.route("/get_stats")
@login_required
def get_stats():
	customer = None
	contracts = None
	contract_invoices = None
	if current_user.user_type == 1:
		customer = Customer.get_by_user_id(current_user.id)
		customers_dwellings_contracts = Customer_Dwelling_Contract.get_by_nif(customer.nif)
		contracts = []
		for customer_dwelling_contract in customers_dwellings_contracts:
			contracts.append(Contract.get_by_contract_number(customer_dwelling_contract.contract_number))
		contract_invoices = {}
		for contract in contracts:
			year = int(contract.init_date.strftime("%Y"))
			year_invoices = Invoice.get_by_contract_number(contract.contract_number)
			total_amounts = []
			for invoice in year_invoices:
				total_amounts.append(invoice.total_amount)
			contract_invoices[year] = total_amounts
	return contract_invoices


def __allowed_file(filename):
   return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def __get_contract_data(results):
	contract = {}
	
	contracted_power = __get_first_value(results["Datos del contrato"]["PotenciaContratada"]).replace(',', '.')
	if contracted_power: 
		contract["contracted_power"] = float(contracted_power)
	else:
		contract["contracted_power"] = None

	contract["toll_access"] = __get_first_value(results["Datos del contrato"]["PeajeAcceso"])
	contract["end_date"] = __get_format_date(results["Datos del contrato"]["FinContrato"])
	contract["CNAE"] = __get_first_value(results["Datos del contrato"]["CNAE"])
	contract["tariff_access"] = __get_first_value(results["Datos del contrato"]["TarifaAcceso"])
	
	return contract


def __get_invoice_data(results, contract_number):
	invoice = {}

	invoice["invoice_number"] = __get_first_value(results["Datos de la factura"]["NumeroFactura"])

	contracted_power_amount = __get_first_value(results["Importes"]["ImportePotenciaContratada"]).replace(',', '.')
	if contracted_power_amount: 
		invoice["contracted_power_amount"] = float(contracted_power_amount)
	else:
		invoice["contracted_power_amount"] = None
	
	consumed_energy_amount = __get_first_value(results["Importes"]["ImporteEnergiaConsumida"]).replace(',', '.')
	if consumed_energy_amount: 
		invoice["consumed_energy_amount"] = float(consumed_energy_amount)
	else:
		invoice["consumed_energy_amount"] = None
	
	invoice["issue_date"] = __get_format_date(results["Datos de la factura"]["FechaEmision"])
	invoice["charge_date"] = __get_format_date(results["Datos de la factura"]["FechaCargo"])
	invoice["init_date"] = __get_format_date(results["Datos de la factura"]["FechaInicio"])
	invoice["end_date"] = __get_format_date(results["Datos de la factura"]["FechaFin"])

	# If issue date is empty, new issue date is end date plus three days
	if not invoice["issue_date"] and invoice["end_date"]:
		split_end_date = invoice_data["end_date"].split("-")
		invoice["issue_date"] = str(
			datetime.datetime(int(split_end_date[0]), int(split_end_date[1]), int(split_end_date[2])) + 
			datetime.timedelta(days=3)
		)

	total_amount = __get_first_value(results["Importes"]["ImporteTotal"]).replace(',', '.')
	if total_amount: 
		invoice["total_amount"] = float(total_amount)
	else:
		invoice["total_amount"] = None
	
	invoice["contract_reference"] = __get_first_value(results["Datos del contrato"]["ReferenciaContrato"])
	invoice["contract_number"] = contract_number 

	return invoice


def __create_dwelling_with_cups(results, cups):
	dwelling = Dwelling(
		cups=cups,
		address=__get_first_value(results["Datos del cliente"]["Direccion"]),
		meter_box_number=__get_first_value(results["Datos del contrato"]["NumeroContador"])
	)
	dwelling.save()


def __create_dwelling_with_random_cups(results):
	cups = 'ES' + str(random.randint(10**15, 10**16-1))
	cups += ''.join(random.choice(string.ascii_uppercase) for _ in range(4))
	dwelling = Dwelling(
		cups=cups,
		address=__get_first_value(results["Datos del cliente"]["Direccion"]),
		meter_box_number=__get_first_value(results["Datos del contrato"]["NumeroContador"])
	)
	dwelling.save()
	return cups


def __get_first_value(data):
	return "" if len(data) == 0 else data[0]


def __get_format_date(dates):
	for date in dates:
		try:
			return dateparser.parse(date).strftime('%Y-%m-%d')
		except AttributeError:
			pass
	return None