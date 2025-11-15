import axios from 'axios';

const API_URL = 'http://localhost:5000/auth';

export const loginUser = async (username, password) => {
  try {
    const res = await axios.post(`${API_URL}/login`, { username, password }, { withCredentials: true });
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || 'Login failed';
  }
};

export const logoutUser = async () => {
  try {
    const res = await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || 'Logout failed';
  }
};

export const getCurrentUser = async () => {
  try {
    const res = await axios.get(`${API_URL}/me`, { withCredentials: true });
    return res.data.user;
  } catch (err) {
    return null;
  }
};
