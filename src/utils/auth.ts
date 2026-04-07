export const saveUser = (user: any) => {
  localStorage.setItem('tws_user', JSON.stringify(user));
};

export const getUser = () => {
  const user = localStorage.getItem('tws_user');
  return user ? JSON.parse(user) : null;
};

export const logout = () => {
  localStorage.removeItem('tws_user');
  window.location.href = '/login';
};