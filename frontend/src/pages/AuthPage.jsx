import React, { useState } from 'react';
import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
    gender: '',
    birthDate: '',
    interests: []
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const interestOptions = [
    'Spor','Müzik','Sanat','Teknoloji','Edebiyat','Sinema','Tiyatro',
    'Fotoğrafçılık','Yemek','Seyahat','Doğa','Gönüllülük','Bilim','Tarih','Felsefe'
  ];

  const validateEmail = (email) => /^\d+@ismu\.edu\.tr$/.test(email);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleInterestChange = (interest) => {
    setFormData(prev => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests };
    });
    if (errors.interests) setErrors(prev => ({ ...prev, interests: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'E-posta gereklidir';
    else if (!validateEmail(formData.email)) newErrors.email = 'Geçerli bir İSMÜ e-posta adresi giriniz';
    if (!formData.password) newErrors.password = 'Şifre gereklidir';
    else if (formData.password.length < 6) newErrors.password = 'Şifre en az 6 karakter olmalıdır';

    if (!isLogin) {
      if (!formData.name.trim()) newErrors.name = 'Ad Soyad gereklidir';
      if (!formData.gender) newErrors.gender = 'Cinsiyet seçimi gereklidir';
      if (!formData.birthDate) newErrors.birthDate = 'Doğum tarihi gereklidir';
      if (!formData.interests.length) newErrors.interests = 'En az bir ilgi alanı seçmelisiniz';
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Şifre tekrarı gereklidir';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        // Login API çağrısı
        const response = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: formData.email, password: formData.password }),
          credentials: 'include' // session için
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Giriş yapılamadı');
        alert('Giriş başarılı: ' + data.user.username);
      } else {
        // Register API (daha sonra backend eklenebilir)
        console.log('Kayıt olunuyor:', formData);
      }
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email:'', password:'', name:'', confirmPassword:'', gender:'', birthDate:'', interests:[] });
    setErrors({});
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-center">
          <div className="auth-card">
            <div className="auth-header">
              <h2>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</h2>
              <p className="auth-subtitle">
                {isLogin ? 'Hesabınıza giriş yaparak devam edin' : 'Yeni hesap oluşturun ve aramıza katılın'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label htmlFor="name">Ad Soyad <span className="required">*</span></label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={errors.name ? 'error' : ''}/>
                    {errors.name && <span className="error-message">{errors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label>Cinsiyet <span className="required">*</span></label>
                    <div className="radio-group">
                      {['Erkek','Kadın','Diğer'].map(g => (
                        <label key={g} className="radio-label">
                          <input type="radio" name="gender" value={g} checked={formData.gender===g} onChange={handleChange}/>
                          <span>{g}</span>
                        </label>
                      ))}
                    </div>
                    {errors.gender && <span className="error-message">{errors.gender}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="birthDate">Doğum Tarihi <span className="required">*</span></label>
                    <input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} className={errors.birthDate ? 'error' : ''} max={new Date().toISOString().split('T')[0]}/>
                    {errors.birthDate && <span className="error-message">{errors.birthDate}</span>}
                  </div>

                  <div className="form-group">
                    <label>İlgi Alanları <span className="required">*</span></label>
                    <div className="interests-grid">
                      {interestOptions.map(i => (
                        <label key={i} className="interest-checkbox">
                          <input type="checkbox" checked={formData.interests.includes(i)} onChange={()=>handleInterestChange(i)} />
                          <span>{i}</span>
                        </label>
                      ))}
                    </div>
                    {errors.interests && <span className="error-message">{errors.interests}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Şifre Tekrar <span className="required">*</span></label>
                    <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={errors.confirmPassword ? 'error' : ''}/>
                    {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="email">Üniversite E-posta <span className="required">*</span></label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className={errors.email ? 'error' : ''}/>
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Şifre <span className="required">*</span></label>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className={errors.password ? 'error' : ''}/>
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'İşleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                {isLogin ? "Hesabınız yok mu? " : "Zaten hesabınız var mı? "}
                <button type="button" className="switch-mode-button" onClick={switchMode}>
                  {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
