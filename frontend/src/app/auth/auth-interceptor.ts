import { HttpEvent, HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { Observable } from "rxjs";
import { AuthStore } from "./auth-store";

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const authStore = inject(AuthStore);
  const authToken = authStore.obtenerToken();

  //Roles
  const userRole = sessionStorage.getItem("userRole") || "CREATIVO";

  // Headers
  let headers = req.headers.set('X-User-Role', userRole);
  if (authToken) {
    headers = headers.set('Authorization', `Bearer ${authToken}`);
  }

  const reqWithToken = req.clone({ headers });
  return next(reqWithToken);
}
