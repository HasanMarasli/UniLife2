import axios from 'axios';

const API_URL = 'http://localhost:5000/auth';

const describeError = (err, action) => {
	const status = err.response?.status;
	const method = err.config?.method?.toUpperCase();
	const url = err.config?.url;
	const serverMessage = err.response?.data?.message ?? err.response?.data?.error;
	console.error(`Error during ${action}:`, { url, method, status, serverMessage, err });
	const segments = [
		`${action} sırasında hata oluştu.`,
		url && `URL: ${url}`,
		method && `Metot: ${method}`,
		status && `HTTP durumu: ${status}`,
		serverMessage && `Sunucu mesajı: ${serverMessage}`,
		`Açıklama: ${err.message}`
	].filter(Boolean);
	return segments.join(' ');
};

export const loginUser = async (username, password) => {
	try {
		const res = await axios.post(`${API_URL}/login`, { username, password }, { withCredentials: true });
		return res.data;
	} catch (err) {
		throw describeError(err, 'login');
	}
};

export const logoutUser = async () => {
	try {
		const res = await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
		return res.data;
	} catch (err) {
		throw describeError(err, 'logout');
	}
};

export const getCurrentUser = async () => {
	try {
		const res = await axios.get(`${API_URL}/me`, { withCredentials: true });
		return res.data.user;
	} catch (err) {
		throw describeError(err, 'fetch current user');
	}
};
