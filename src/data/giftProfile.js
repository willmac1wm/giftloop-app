export const AGE_BANDS = [
  { id: 'child', label: 'Under 13', phrase: 'child' },
  { id: 'teen', label: '13–17', phrase: 'teenager' },
  { id: '18-24', label: '18–24', phrase: 'adult age 18 to 24' },
  { id: '25-34', label: '25–34', phrase: 'adult age 25 to 34' },
  { id: '35-44', label: '35–44', phrase: 'adult age 35 to 44' },
  { id: '45-54', label: '45–54', phrase: 'adult age 45 to 54' },
  { id: '55+', label: '55+', phrase: 'adult age 55 or older' },
];

export const SHOP_FOR = [
  { id: 'woman', label: 'Woman', phrase: 'woman' },
  { id: 'man', label: 'Man', phrase: 'man' },
  { id: 'anyone', label: 'Anyone', phrase: '' },
];

export function profileGiftQuery({ shopFor, ageBand }) {
  const age = AGE_BANDS.find((item) => item.id === ageBand);
  const who = SHOP_FOR.find((item) => item.id === shopFor);
  if (!age && !who) return '';
  if (age && (age.id === 'child' || age.id === 'teen' || !who || who.id === 'anyone')) {
    return age.phrase;
  }
  if (who && who.phrase && age) return `${who.phrase} ${age.phrase}`;
  if (who && who.phrase) return who.phrase;
  return age ? age.phrase : '';
}
