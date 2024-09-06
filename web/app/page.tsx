"use client";
import { useState } from 'react';

export default function Page() {
  const [address, setAddress] = useState("");

  const handleAddres = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setAddress(event.target.value)
  }

  return (
    <form>
      <input type='text' value={address}/>
      <input type='submit' onSubmit={handleAddres}/>
      <input type='submit' onSubmit={handleAddres}/>
    </form>
  )
}
