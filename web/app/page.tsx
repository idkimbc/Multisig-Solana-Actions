"use client";
import React, { useState, FormEvent } from 'react';

export default function Page() {
  const [address, setAddress] = useState("");
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://extended-blinks.vercel.app/'
    : 'http://localhost:3000';

  const handleAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(event.target.value)
  }

  const handleRedirection = () => {

  }

  // https://dial.to/?action=solana-action%3A${baseUrl}/api/action/approve?squad=${address}`

  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <input type="text" onChange={handleAddress}  />
      <a href={`https://dial.to/?action=solana-action%3A${baseUrl}/api/actions/squad?address=${address}`}>Make transaction</a>
      <a href={`https://dial.to/?action=solana-action%3A${baseUrl}/api/actions/squad/config?address=${address}`}>Config wallet</a>
      <a href={`https://dial.to/?action=solana-action%3A${baseUrl}/api/actions/squad/deposit?address=${address}`}>Deposit</a>
      <a href={`https://dial.to/?action=solana-action%3A${baseUrl}/api/actions/squad/vote?address=${address}`}>vote on a given transaction</a>
    </div>
  )
}