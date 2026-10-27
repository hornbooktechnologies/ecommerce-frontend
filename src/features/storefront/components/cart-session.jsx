'use client';
import { useEffect } from 'react';
import { listenForBagChanges } from '../store';
export default function CartSession() {
  useEffect(() => listenForBagChanges(), []);
  return null;
}
