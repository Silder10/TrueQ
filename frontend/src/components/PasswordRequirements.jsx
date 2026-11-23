import { PASSWORD_RULES } from "../utils/passwordRules";

export function PasswordRequirements({ password }) {
  return (
    <div className="password-requirements">
      <p>Tu contraseña debe cumplir estos requisitos:</p>
      <ul>
        {PASSWORD_RULES.map((rule) => (
          <li key={rule.id} className={rule.test(password) ? "requirement-met" : ""}>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}