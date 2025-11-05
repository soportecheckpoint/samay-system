import { useAdminStore } from '../store';

export function EventLog() {
  const { logs, clearLogs } = useAdminStore();

  const getLogColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'text-blue-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'event':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'event':
        return '📡';
      default:
        return '•';
    }
  };

  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          📝 Event Log
        </h2>
        <button
          onClick={clearLogs}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
        >
          🗑️ Limpiar
        </button>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No hay eventos registrados
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 hover:bg-gray-800 p-2 rounded transition"
              >
                <span className="text-lg">{getLogIcon(log.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-gray-500 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`text-xs font-semibold uppercase ${getLogColor(
                        log.type
                      )}`}
                    >
                      {log.type}
                    </span>
                  </div>
                  <p className={`${getLogColor(log.type)} break-words`}>
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
