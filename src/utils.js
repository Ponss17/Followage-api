function pluralize(n, singular, plural) {
  return n === 1 ? singular : plural;
}

export function diffFromNow(sinceDate) {
  const now = new Date();
  let ms = now - sinceDate;
  if (ms < 0) ms = 0;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remDays = Math.floor((days % 365) % 30);

  return { years, months, days: remDays, totalDays: days };
}

export function formatFollowageText(json, lang = 'es') {
  const { viewer, channel, following } = json;
  if (!following) {
    if (lang === 'en') {
      return `${viewer} is not following ${channel}.`;
    }
    return `${viewer} no sigue a ${channel}.`;
  }

  const { years, months, days } = json.duration;
  const parts = [];
  if (years) parts.push(`${years} ${lang === 'en' ? pluralize(years, 'year', 'years') : pluralize(years, 'año', 'años')}`);
  if (months) parts.push(`${months} ${lang === 'en' ? pluralize(months, 'month', 'months') : pluralize(months, 'mes', 'meses')}`);
  if (days || parts.length === 0) parts.push(`${days} ${lang === 'en' ? pluralize(days, 'day', 'days') : pluralize(days, 'día', 'días')}`);

  const sinceDate = new Date(json.followed_at);
  const sinceStr = sinceDate.toISOString().split('T')[0];

  if (lang === 'en') {
    return `${viewer} has been following ${channel} for ${parts.join(', ')} (since ${sinceStr}).`;
  }
  return `${viewer} sigue a ${channel} desde hace ${parts.join(', ')} (desde ${sinceStr}).`;
}