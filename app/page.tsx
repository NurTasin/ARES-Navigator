import MarsGlobeViewer from './MarsGlobeViewer';

export const metadata = {
  title: 'Mars 3D Interactive Globe - NASA Trek Real-Time Streaming',
  description: 'Interactive 3D Mars globe with real-time GPU elevation displacement streaming from NASA Trek API, originating at Jezero Crater.',
};

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-black">
      <MarsGlobeViewer />
    </main>
  );
}
