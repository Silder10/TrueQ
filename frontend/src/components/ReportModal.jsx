import { useState } from "react";
import { Flag, X } from "lucide-react";
import { api } from "../api/client";
import "./ReportModal.css";

const REASONS = ["Acoso", "Spam", "Fraude", "Perfil falso", "No cumplió con su parte", "Otro"];

export function ReportModal({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError("Elegí un motivo.");
      return;
    }
    if (reason === "Otro" && !description.trim()) {
      setError("Contanos el motivo si elegís 'Otro'.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/reports", {
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h3>
            <Flag size={17} /> Reportar
          </h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="banner banner-success">
            Gracias, un administrador va a revisarlo. No se notificará a la persona reportada.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="stack">
            {error && <div className="banner banner-error">{error}</div>}
            <div className="field">
              <label>Motivo</label>
              <div className="report-reason-list">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`chip ${reason === r ? "chip-active" : ""}`}
                    onClick={() => setReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="report-description">
                Detalles {reason === "Otro" ? "(obligatorio)" : "(opcional)"}
              </label>
              <textarea
                id="report-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? <span className="spinner" /> : "Enviar reporte"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
