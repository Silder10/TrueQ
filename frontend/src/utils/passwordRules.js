// Reglas de contraseña de TrueQ (deben coincidir con el backend)
export const PASSWORD_RULES = [
    { id: "min", label: "Al menos 8 caracteres", test: (p) => p.length >= 8 },
    { id: "max", label: "Máximo 128 caracteres", test: (p) => p.length > 0 && p.length <= 128 },
    { id: "upper", label: "Una letra mayúscula", test: (p) => /[A-Z]/.test(p) },
    { id: "lower", label: "Una letra minúscula", test: (p) => /[a-z]/.test(p) },
    { id: "digit", label: "Un número", test: (p) => /\d/.test(p) },
    { id: "special", label: "Un carácter especial (!, @, #, etc.)", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];

export function isPasswordValid(password) {
    return PASSWORD_RULES.every((rule) => rule.test(password));
}