import React, { useEffect, useState, useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';
import {
  Typography,
  Container,
  Avatar,
  makeStyles,
  Grid,
  TextField,
  Button,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@material-ui/core';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import Cookies from 'universal-cookie';
import axios from 'axios';
import { createNotification } from 'react-redux-notify';
import {
  successSaveProfileNotification,
  successDeleteAccountNotification
} from '../../redux/constants/notifications';
import { logout } from '../../redux/actions/authentication';


const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.primary.dark,
  },
  form: {
    width: '100%',
    marginTop: theme.spacing(3),
  },
  formControl: {
    minWidth: 100,
  },
}));

const regions = [
  "Almería",
  "Baleares",
  "Valladolid",
  "León",
  "Melilla",
  "Palencia",
  "Cantabria",
  "Navarra",
  "Ceuta",
  "Cuenca",
  "Álava",
  "Gipuzkoa",
  "Granada",
  "Murcia",
  "Burgos",
  "Salamanca",
  "Zamora",
  "Huesca",
  "Madrid",
  "Guadalajara",
  "Segovia",
  "Sevilla",
  "Tarragona",
  "Teruel",
  "Valencia",
  "Bizkaia",
  "Ourense",
  "Lleida",
  "Zaragoza",
  "Girona",
  "Albacete",
  "Alicante",
  "Ávila",
  "Cáceres",
  "Toledo",
  "Badajoz",
  "Córdoba",
  "Huelva",
  "A Coruña",
  "Málaga",
  "Pontevedra",
  "La Rioja",
  "Soria",
  "Barcelona",
  "Cádiz",
  "Asturias",
  "Castellón",
  "Ciudad Real",
  "Jaén",
  "Lugo",
  "Santa Cruz de Tenerife",
  "Las Palmas",
]

const CompanyProfile = ({ type, createNotification, logout }) => {
  const classes = useStyles();
  const history = useHistory();
  const cookies = new Cookies();
  const csrfAccessToken = cookies.get('csrf_access_token');

  const [saveProfileDialogState, setSaveProfileDialogState] = useState(false);
  const [deleteAccountDialogState, setDeleteAccountDialogState] = useState(false);

  const initialUserData = {
    name: '',
    password: '',
    passwordconfirmation: '',
    email: '',
    phone: '',
    url: '',
    address: 'Almeria'
  };

  const [userData, dispatchUserData] = useReducer(
    (state, newState) => ({ ...state, ...newState }),
    initialUserData
  );

  const [formErrorState, dispatchFormErrorState] = useReducer(
    (state, newState) => ({ ...state, ...newState }),
    initialUserData
  );

  const handleChange = event => {
    const { name, value } = event.target;
    dispatchUserData({ [name]: value });
  };

  const openSaveProfileDialog = () => setSaveProfileDialogState(true);
  const closeSaveProfileDialog = () => setSaveProfileDialogState(false);
  const handleSaveProfile = async (e) => {
    dispatchFormErrorState(initialUserData);
    try {
      await axios.put(
        '/api/company/update-profile',
        userData,
        { headers: { 'X-CSRF-TOKEN': csrfAccessToken } }
      );
      setSaveProfileDialogState(false);
      createNotification(successSaveProfileNotification);
    } catch (error) {
      setSaveProfileDialogState(false);
      const errors = error.response.data;
      for (const key in errors)
        dispatchFormErrorState({ [key]: errors[key][0] });
    }
  }

  const openDeleteAccountDialog = () => setDeleteAccountDialogState(true);
  const closeDeleteAccountDialog = () => setDeleteAccountDialogState(false);
  const handleDeleteAccount = async (e) => {
    try {
      await axios.delete(
        '/api/company/delete-account',
        { headers: { 'X-CSRF-TOKEN': csrfAccessToken } }
      );
      await axios.post('/api/auth/logout');
      logout();
      setDeleteAccountDialogState(false);
      createNotification(successDeleteAccountNotification);
      history.push('/');
    } catch (error) {
      setDeleteAccountDialogState(false);
      console.log(error);
    }
  }

  const getProfileData = async () => {
    const response = await axios.get('/api/company/get-profile-data');
    dispatchUserData(response.data);
  }

  useEffect(() => {
    getProfileData();
  }, []);

  return (
    <Container maxWidth="sm">
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
          <AccountCircleIcon />
        </Avatar>
        <Typography variant="h4" align="center">Mi perfil</Typography>
        <form className={classes.form} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                required
                fullWidth
                id="name"
                label="Nombre"
                name="name"
                value={userData.name || ''}
                onChange={handleChange}
                error={formErrorState.name ? true : false}
                helperText={formErrorState.name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                variant="outlined"
                type="password"
                fullWidth
                id="password"
                label="Contraseña"
                name="password"
                onChange={handleChange}
                error={formErrorState.password ? true : false}
                helperText={formErrorState.password || "Si se deja vacío no se cambiará"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                variant="outlined"
                type="password"
                fullWidth
                id="passwordconfirmation"
                label="Confirme contraseña"
                name="passwordconfirmation"
                onChange={handleChange}
                error={formErrorState.passwordconfirmation ? true : false}
                helperText={formErrorState.passwordconfirmation}
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                variant="outlined"
                type="email"
                fullWidth
                id="email"
                label="Email"
                name="email"
                value={userData.email || ''}
                onChange={handleChange}
                error={formErrorState.email ? true : false}
                helperText={formErrorState.email}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                variant="outlined"
                required
                fullWidth
                id="phone"
                label="Teléfono"
                name="phone"
                value={userData.phone || ''}
                onChange={handleChange}
                error={formErrorState.phone ? true : false}
                helperText={formErrorState.phone}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                id="url"
                label="URL"
                name="url"
                value={userData.url || ''}
                onChange={handleChange}
                error={formErrorState.url ? true : false}
                helperText={formErrorState.url}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" className={classes.formControl}>
                <InputLabel id="select-company-address">Dirección</InputLabel>
                <Select
                  required
                  labelId="select-company-address"
                  id="address"
                  name="address"
                  defaultValue="Almería"
                  value={userData.address}
                  onChange={handleChange}
                  label="Dirección"
                >
                  {regions.map((region, index) => {
                    return (
                      <MenuItem key={index} value={region}>{region}</MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={() => openSaveProfileDialog()}
              >
                Guardar
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                onClick={() => openDeleteAccountDialog()}
              >
                Eliminar cuenta
              </Button>
            </Grid>
            <Dialog open={saveProfileDialogState}>
              <DialogContent>
                <DialogContentText>
                  ¿Seguro que quieres guardar los datos de tu perfil?
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button variant="contained" onClick={handleSaveProfile} color="primary">Aceptar</Button>
                <Button variant="contained" onClick={closeSaveProfileDialog}>Cancelar</Button>
              </DialogActions>
            </Dialog>
            <Dialog open={deleteAccountDialogState}>
              <DialogContent>
                <DialogContentText>
                  ¿Seguro que quieres eliminar definitivamente tu cuenta?
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button variant="contained" onClick={handleDeleteAccount} color="secondary">Eliminar definitivamente</Button>
                <Button variant="contained" onClick={closeDeleteAccountDialog}>Cancelar</Button>
              </DialogActions>
            </Dialog>
          </Grid>
        </form>
      </div>
    </Container>
  );
}

const mapStateToProps = state => {
  const { authentication } = state;
  return authentication.loggedUser;
};

const mapDispatchToProps = dispatch => ({
  createNotification: (config) => {
    dispatch(createNotification(config))
  },
  logout: () => dispatch(logout())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CompanyProfile);