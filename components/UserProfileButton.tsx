"use client";

import React, { useState, useEffect } from "react";
import UserProfileModal, { loadUserProfile, type UserProfileData } from "./UserProfileModal";

export default function UserProfileButton({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);

  useEffect(() => {
    setProfile(loadUserProfile());
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`btn-user-profile-trigger ${className}`}
        title="Ver Perfil do Produtor"
        aria-label="Perfil do Usuário"
      >
        <span className="profile-btn-avatar">{profile?.avatarIcon || "🎧"}</span>
        <span className="profile-btn-name">{profile?.producerName || "Produtor"}</span>
        <span className="profile-btn-badge">PRO</span>
      </button>

      <UserProfileModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
