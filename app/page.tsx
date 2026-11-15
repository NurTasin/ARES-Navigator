import MarsGlobeViewer from './MarsGlobeViewer';

export const metadata = {
  title: 'ARES Navigator — Team Starora | Mars 3D Tactical Mission Control',
  description:
    'ARES Navigator by Team Starora — Interactive 3D Mars globe & EVA tactical mission planner with real-time NASA Mars Trek DEM streaming.',
};

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-black">
      <MarsGlobeViewer />
    </main>
  );
}
