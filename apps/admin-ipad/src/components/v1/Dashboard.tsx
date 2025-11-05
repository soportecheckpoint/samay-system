import { useAdminStore } from '../../store';
import { ModuleControls } from '../ModuleControls';
import { ArduinosList } from '../ArduinosList';
import { TimerControl } from '../TimerControl';
import { CustomEventForm } from '../CustomEventForm';
import { AdminTabs } from '../AdminTabs';

export function DashboardV1() {
  const { connected, modules } = useAdminStore((state) => ({
    connected: state.connected,
    modules: state.modules,
  }));

  const moduleList = Object.values(modules);
  const activeModules = moduleList.filter((module) => module.status === 'active').length;
  const completedModules = moduleList.filter((module) => module.status === 'completed').length;
  const pendingModules = moduleList.filter((module) => module.status === 'waiting').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Panel de control
            </h1>
            <p className="text-sm text-slate-400 sm:text-base">
              Gestiona la sesión, los módulos y el hardware en tiempo real.
            </p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              connected
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}
          >
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                connected
                  ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                  : 'bg-rose-400 shadow-[0_0_12px_rgba(244,114,182,0.5)]'
              } ${connected ? 'animate-pulse' : ''}`}
            />
            {connected ? 'Conectado' : 'Sin conexión'}
          </div>
        </header>

        <AdminTabs
          stats={{
            activeModules,
            completedModules,
            pendingModules,
          }}
          main={{
            timer: <TimerControl />,
            modules: <ModuleControls />,
          }}
          sidebar={{
            arduinos: <ArduinosList />,
            customEvent: <CustomEventForm />,
          }}
        />
      </div>
    </div>
  );
}

export default DashboardV1;
