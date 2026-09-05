const TOKEN_KEY = "cms_jwt";

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function isLoggedIn() {
    return !!getToken();
}

function logout() {
    clearToken();
    window.location.href = "login.html";
}