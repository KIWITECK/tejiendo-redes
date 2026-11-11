// Protocolo de enlace entre coordinador y nodos: JSON delimitado por saltos de línea (NDJSON) sobre TCP.
export function send(socket, message) {
  if (socket.destroyed || !socket.writable) return false;
  socket.write(JSON.stringify(message) + '\n');
  return true;
}

/** Reensambla fragmentos TCP en mensajes completos. */
export function readMessages(socket, onMessage) {
  let buffer = '';
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try { onMessage(JSON.parse(line)); } catch { /* línea corrupta: se descarta */ }
    }
  });
}
