import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProblemError } from "@/lib/api";
import { LoginPage } from "../LoginPage";
import {
  describeLoginError,
  loginSchema,
  MAX_FAILED_ATTEMPTS,
} from "../login/loginSchema";

const login = vi.fn();
vi.mock("@/lib/queries", () => ({
  authApi: { login: (...args: unknown[]) => login(...args) },
}));

const ADMIN = {
  accessToken: "t",
  tokenType: "Bearer",
  expiresIn: 900,
  user: {
    id: "1",
    email: "admin@keystreet.co",
    fullName: "Admin",
    role: "ADMIN_TENANT",
    tenantId: "x",
  },
};

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

const unauthorized = () =>
  new ProblemError(401, { title: "Unauthorized", detail: "Bad credentials" });

beforeEach(() => {
  login.mockReset();
});
afterEach(cleanup);

describe("loginSchema", () => {
  it("exige correo con formato válido y contraseña", () => {
    const r = loginSchema.safeParse({ email: "admin@keystreet", password: "" });
    expect(r.success).toBe(false);
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toContain(
      "Revisa el formato del correo: nombre@dominio.com",
    );
    expect(messages).toContain("Escribe tu contraseña.");
  });

  it("recorta espacios del correo", () => {
    const r = loginSchema.parse({
      email: "  admin@keystreet.co ",
      password: "x",
    });
    expect(r.email).toBe("admin@keystreet.co");
  });
});

describe("describeLoginError", () => {
  it("no revela si el correo existe ante 401", () => {
    expect(describeLoginError(unauthorized())).toEqual({
      kind: "credentials",
      message: "Correo o contraseña incorrectos.",
    });
  });

  it("distingue límite de intentos, red y servidor", () => {
    expect(describeLoginError(new ProblemError(429, { title: "x" })).kind).toBe(
      "rate-limit",
    );
    expect(describeLoginError(new TypeError("Failed to fetch")).kind).toBe(
      "network",
    );
    expect(describeLoginError(new ProblemError(503, { title: "x" })).kind).toBe(
      "server",
    );
  });
});

describe("LoginPage", () => {
  it("muestra los errores de cada campo sin llamar al API", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /ingresar al panel/i }));
    expect(
      await screen.findByText("Escribe tu correo electrónico."),
    ).toBeInTheDocument();
    expect(screen.getByText("Escribe tu contraseña.")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(login).not.toHaveBeenCalled();
  });

  it("ante credenciales malas avisa, limpia la contraseña y cuenta intentos", async () => {
    login.mockImplementation(() => Promise.reject(unauthorized()));
    const user = userEvent.setup();
    renderLogin();
    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "Admin@KeyStreet.co",
    );
    await user.type(screen.getByLabelText("Contraseña"), "mala");
    await user.click(
      screen.getByRole("button", { name: /ingresar al panel/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Correo o contraseña incorrectos.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      `${MAX_FAILED_ATTEMPTS - 1}`,
    );
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
    expect(login).toHaveBeenCalledWith({
      email: "admin@keystreet.co",
      password: "mala",
    });
  });

  it("bloquea el botón tras demasiados intentos fallidos", async () => {
    login.mockImplementation(() => Promise.reject(unauthorized()));
    const user = userEvent.setup();
    renderLogin();
    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "admin@keystreet.co",
    );
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await user.type(screen.getByLabelText("Contraseña"), "mala");
      await user.click(
        screen.getByRole("button", { name: /ingresar al panel/i }),
      );
      await waitFor(() => expect(login).toHaveBeenCalledTimes(i + 1));
      await waitFor(() =>
        expect(screen.getByLabelText("Contraseña")).not.toBeDisabled(),
      );
    }
    expect(
      await screen.findByRole("button", { name: /espera \d+ s/i }),
    ).toBeDisabled();
  });

  it("muestra el estado de éxito al entrar", async () => {
    login.mockResolvedValue(ADMIN);
    const user = userEvent.setup();
    renderLogin();
    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "admin@keystreet.co",
    );
    await user.type(screen.getByLabelText("Contraseña"), "buena");
    await user.click(
      screen.getByRole("button", { name: /ingresar al panel/i }),
    );
    expect(
      await screen.findByRole("button", { name: /listo! entrando/i }),
    ).toBeDisabled();
  });

  it("permite mostrar y ocultar la contraseña", async () => {
    const user = userEvent.setup();
    renderLogin();
    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");
    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    expect(input).toHaveAttribute("type", "text");
  });
});
