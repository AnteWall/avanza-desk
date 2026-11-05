import type { Messages } from "@/lib/i18n";

export const auth: Messages["auth"] = {
  qrLabel: "QR-kod för BankID",
  title: "Logga in i AvanzaDesk",
  expired: "Din session har gått ut. Logga in igen för att fortsätta.",
  intro: "Logga in med BankID för att se dina konton och handla.",
  start: "Logga in med BankID",
  scan: "Skanna med BankID",
  scanHint: "Öppna BankID-appen i telefonen, tryck på QR-ikonen och rikta kameran hit.",
  openHere: "Öppna BankID på den här datorn",
  welcome: (name) => `Välkommen, ${name}`,
  signedIn: "Du är inloggad.",
  failures: {
    denied: "Inloggningen avbröts i BankID.",
    expired: "QR-koden gick ut. Börja om för att få en ny.",
    error: "Kunde inte nå Avanza. Kontrollera din anslutning och försök igen.",
  },
};
