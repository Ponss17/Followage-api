export function renderCommands(baseUrl, authCode, userId, token) {
  const authParam = authCode ? `auth=${authCode}` : `user_id=${userId}&token=${token}`;
  const seCommand = `$(customapi ${baseUrl}/api/clips/create?${authParam}&channel=$(channel)&creator=\\${user})`;
  const streamElementsCommand = document.getElementById('streamElementsCommand');
  if (streamElementsCommand) streamElementsCommand.textContent = seCommand;
  const nbCommand = `$(urlfetch ${baseUrl}/api/clips/create?${authParam}&channel=$(channel)&creator=$(user))`;
  const nightbotCommand = document.getElementById('nightbotCommand');
  if (nightbotCommand) nightbotCommand.textContent = nbCommand;
  const slCommand = `$readapi(${baseUrl}/api/clips/create?${authParam}&channel=$mychannel&creator=$user)`;
  const streamlabsCommand = document.getElementById('streamlabsCommand');
  if (streamlabsCommand) streamlabsCommand.textContent = slCommand;
}