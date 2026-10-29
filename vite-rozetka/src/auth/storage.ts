const tokenKey = 'rozetka.accessToken'

export function getToken() {
  return localStorage.getItem(tokenKey)
}

export function setToken(token: string) {
  localStorage.setItem(tokenKey, token)
}

export function clearToken() {
  localStorage.removeItem(tokenKey)
}
