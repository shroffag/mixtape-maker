"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BsPlayFill } from "react-icons/bs";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl mb-4 font-serif">Mixtape Maker</h1>
        <p className="text-2xl mb-12">
          Create and share mixtapes with your friends
        </p>
        
        {session ? (
          <>
            <p className="mb-8 text-lg">Welcome, {session.user?.name}!</p>
            <div className="flex flex-col space-y-4 items-center">
              <button
                onClick={() => router.push("/create")}
                className="flex items-center justify-center space-x-2 w-64 bg-[#F47B3E] hover:bg-[#E06A2D] text-white font-medium py-3 px-6 rounded"
              >
                <BsPlayFill className="w-5 h-5" />
                <span>Create New Mixtape</span>
              </button>
              <button
                onClick={() => signOut()}
                className="w-64 border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-3 px-6 rounded"
              >
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => signIn("spotify")}
            className="w-64 bg-black hover:bg-gray-900 text-white font-medium py-3 px-6 rounded"
          >
            Sign in with Spotify
          </button>
        )}
      </div>
    </div>
  );
}
