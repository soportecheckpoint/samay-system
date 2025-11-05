import { useState } from 'react';
import { ArduinoSimulator } from './ArduinoSimulator.tsx';
import { ButtonsSimulator } from './ButtonsSimulator.tsx';
import type { ReactNode } from 'react';

interface Stats {
  activeModules: number;
  completedModules: number;
  pendingModules: number;
}

interface AdminTabsProps {
  stats: Stats;
  main: {
    timer: ReactNode;
    modules: ReactNode;
  };
  sidebar: {
    arduinos: ReactNode;
    customEvent: ReactNode;
  };
}

type TabId = 'overview' | 'simulator' | 'buttons-simulator';

const TABS: Array<{ id: TabId; label: string; description: string }> = [
  {
    id: 'overview',
    label: 'Operación',
    description: 'Monitorea y controla en tiempo real.',
  },
  {
    id: 'simulator',
    label: 'Simulador de Arduinos',
    description: 'Emula dispositivos físicos y eventos.',
  },
  {
    id: 'buttons-simulator',
    label: 'Simulador de Botones',
    description: 'Controla el juego de botones físicos.',
  },
];

export function AdminTabs({ stats, main, sidebar }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/30 p-2">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 sm:flex-none sm:px-6 ${
                isActive
                  ? 'border-white/20 bg-white/10 text-white shadow-lg shadow-black/30'
                  : 'border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/5'
              }`}
            >
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span className="mt-1 block text-xs text-slate-400">{tab.description}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === 'overview' ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-400">Módulos activos</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.activeModules}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-400">Módulos completados</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.completedModules}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-400">Listos para iniciar</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.pendingModules}</p>
            </div>
          </section>

          <div className="grid gap-10 lg:grid-cols-[1.7fr_1fr]">
            <div className="flex flex-col gap-10">
              {main.timer}
              {main.modules}
            </div>
            <div className="flex flex-col gap-10">
              {sidebar.arduinos}
              {sidebar.customEvent}
            </div>
          </div>
        </>
      ) : activeTab === 'simulator' ? (
        <ArduinoSimulator />
      ) : (
        <ButtonsSimulator />
      )}
    </div>
  );
}
