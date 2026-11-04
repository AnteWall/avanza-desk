// A path under the site's base (/avanza-desk), whether or not BASE_URL ends with a slash.
export const url = (path = "") =>
  `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
