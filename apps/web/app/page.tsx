import MapView from "@/components/map-view";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="z-10 w-full h-full font-mono text-sm lg:flex">
        <MapView />
      </div>
    </main>
  );
}
