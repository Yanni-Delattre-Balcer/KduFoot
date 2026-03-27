/**
 * Formats a phone number string to a French format (+33 X XX XX XX XX)
 */
export const formatPhoneNumber = (value: string) => {
  let raw = value.replace(/\D/g, "");

  if (raw.length > 0 && !raw.startsWith("33")) {
    if (raw.startsWith("0")) raw = "33" + raw.substring(1);
    else raw = "33" + raw;
  }
  if (raw.length > 11) raw = raw.substring(0, 11);

  let formatted = "";

  if (raw.length > 0) formatted += "+";
  if (raw.length > 0) formatted += raw.substring(0, 2);
  if (raw.length > 2) formatted += " " + raw.substring(2, 3);
  if (raw.length > 3) formatted += " " + raw.substring(3, 5);
  if (raw.length > 5) formatted += " " + raw.substring(5, 7);
  if (raw.length > 7) formatted += " " + raw.substring(7, 9);
  if (raw.length > 9) formatted += " " + raw.substring(9, 11);

  return formatted;
};

/**
 * Formats a SIRET/SIREN number with spaces (XXX XXX XXX XXXXX)
 */
export const formatSiret = (value: string) => {
  let raw = value.replace(/\D/g, "");

  if (raw.length > 14) raw = raw.substring(0, 14);

  let formatted = "";

  for (let i = 0; i < raw.length; i++) {
    if (i === 3 || i === 6 || i === 9) formatted += " ";
    formatted += raw[i];
  }

  return formatted;
};

/**
 * Extracts the department code from a zip code
 */
export const getDept = (zip?: string | null) => {
  if (!zip || zip.length < 2) return "";

  return zip.substring(0, 2);
};
