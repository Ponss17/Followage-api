function pluralize(n, singular, plural) {
  return n === 1 ? singular : plural;
}

export function diffFromNow(sinceDate) {
  const now = new Date();
  let ms = now - sinceDate;
  if (ms < 0) ms = 0;

  const secondsTotal = Math.floor(ms / 1000);
  const minutesTotal = Math.floor(secondsTotal / 60);
  const hoursTotal = Math.floor(minutesTotal / 60);
  const daysTotal = Math.floor(hoursTotal / 24);

  const years = Math.floor(daysTotal / 365);
  const months = Math.floor((daysTotal % 365) / 30);
  const remDays = Math.floor((daysTotal % 365) % 30);
  const weeks = Math.floor(remDays / 7);
  const days = remDays % 7;

  const hours = hoursTotal % 24;
  const minutes = minutesTotal % 60;
  const seconds = secondsTotal % 60;

  return { years, months, weeks, days, hours, minutes, seconds, totalDays: daysTotal };
}

export function formatByPattern(duration, pattern = 'ymdhis', lang = 'en') {
  const isEs = lang === 'es';
  const tokens = {
    y: { value: duration.years, singular: isEs ? 'año' : 'year', plural: isEs ? 'años' : 'years' },
    m: { value: duration.months, singular: isEs ? 'mes' : 'month', plural: isEs ? 'meses' : 'months' },
    w: { value: duration.weeks, singular: isEs ? 'semana' : 'week', plural: isEs ? 'semanas' : 'weeks' },
    d: { value: duration.days, singular: isEs ? 'día' : 'day', plural: isEs ? 'días' : 'days' },
    h: { value: duration.hours, singular: isEs ? 'hora' : 'hour', plural: isEs ? 'horas' : 'hours' },
    i: { value: duration.minutes, singular: isEs ? 'minuto' : 'minute', plural: isEs ? 'minutos' : 'minutes' },
    s: { value: duration.seconds, singular: isEs ? 'segundo' : 'second', plural: isEs ? 'segundos' : 'seconds' },
  };

  const parts = [];
  for (const ch of pattern) {
    const t = tokens[ch];
    if (!t) continue;
    const v = t.value;
    if (typeof v !== 'number') continue;
    if (v > 0) {
      parts.push(`${v} ${pluralize(v, t.singular, t.plural)}`);
    }
  }

  if (parts.length === 0) {
    const lastChar = pattern[pattern.length - 1];
    const lastToken = tokens[lastChar];
    if (lastToken) {
      parts.push(`0 ${pluralize(0, lastToken.singular, lastToken.plural)}`);
    }
  }

  return parts.join(', ');
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
  return `${viewer} lleva siguiendo a ${channel} ${parts.join(', ')}.`;
}