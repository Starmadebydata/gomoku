import GomokuGame from "@/components/gomoku-game"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-center">Gomoku (Five in a Row)</h1>
      <GomokuGame />
    </main>
  )
}
