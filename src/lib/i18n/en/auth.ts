export const auth = {
  qrLabel: "BankID QR code",
  title: "Sign in to AvanzaDesk",
  expired: "Your session has expired. Sign in again to continue.",
  intro: "Sign in with BankID to see your accounts and trade.",
  start: "Sign in with BankID",
  scan: "Scan with BankID",
  scanHint: "Open the BankID app on your phone, tap the QR icon and point the camera here.",
  openHere: "Open BankID on this computer",
  welcome: (name: string) => `Welcome, ${name}`,
  signedIn: "You're signed in.",
  failures: {
    denied: "Sign-in was cancelled in BankID.",
    expired: "The QR code expired. Start again to get a new one.",
    error: "Couldn't reach Avanza. Check your connection and try again.",
  },
};
