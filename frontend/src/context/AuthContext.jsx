import { createContext, useContext, useMemo, useState } from "react";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("erp_user") || "null"));
  const value = useMemo(() => ({ user, login(payload) { localStorage.setItem("erp_access_token", payload.accessToken); localStorage.setItem("erp_user", JSON.stringify(payload.user)); setUser(payload.user); }, logout() { localStorage.removeItem("erp_access_token"); localStorage.removeItem("erp_user"); setUser(null); } }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
