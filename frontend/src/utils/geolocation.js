/**
 * Pide la ubicación real del navegador y la traduce a un nombre de ciudad
 * legible usando Nominatim (OpenStreetMap) — es un servicio público, sin
 * API key, pensado para volumen bajo de uso como el de esta app.
 * https://nominatim.org/release-docs/latest/api/Reverse/
 */
export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tu navegador no soporta geolocalización."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Permiso de ubicación denegado. Podés escribir tu ciudad a mano."));
        } else {
          reject(new Error("No pudimos obtener tu ubicación."));
        }
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  });
}

export async function reverseGeocodeCity(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const address = data.address || {};
    return address.city || address.town || address.village || address.county || data.display_name || null;
  } catch {
    return null;
  }
}

export async function detectLocation() {
  const { latitude, longitude } = await getBrowserLocation();
  const city = await reverseGeocodeCity(latitude, longitude);
  return { latitude, longitude, city };
}
