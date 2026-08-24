"use client";

import React, { useState, useEffect } from "react";

export interface UserProfileData {
  producerName: string;
  avatarIcon: string;
  favoriteGenre: string;
  defaultBpm: number;
  primaryDaw: string;
  tuningStandard: "440Hz" | "432Hz";
  totalExports: number;
  licenseType: "PRO Vitalício" | "Community";
}

const DEFAULT_PROFILE: UserProfileData = {
  producerName: "Produtor AutoTunel",
  avatarIcon: "🎧",
  favoriteGenre: "trap-br",
  defaultBpm: 140,
  primaryDaw: "FL Studio",
  tuningStandard: "440Hz",
  totalExports: 12,
  licenseType: "PRO Vitalício",
};

const STORAGE_KEY = "autotunel_user_profile";

export function loadUserProfile(): UserProfileData {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfileData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export default function UserProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<UserProfileData>(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProfile(loadUserProfile());
      setIsEditing(false);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveUserProfile(profile);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const avatarOptions = ["🎧", "🎹", "🎛️", "🔥", "⚡", "🛸", "🎙️", "💎"];

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-drawer" onClick={(e) => e.stopPropagation()}>
        {/* DRAWER HEADER */}
        <div className="profile-header">
          <div className="profile-header-info">
            <span className="profile-title">Perfil do Produtor</span>
            <span className="profile-subtitle">Configurações e preferências locais</span>
          </div>
          <button className="profile-close-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        {/* PROFILE CARD SUMMARY */}
        <div className="profile-summary-card">
          <div className="profile-avatar-large">
            <span>{profile.avatarIcon}</span>
          </div>
          <div className="profile-summary-details">
            <div className="profile-name-row">
              <h3 className="profile-name">{profile.producerName}</h3>
              <span className="profile-badge-pro">✓ {profile.licenseType}</span>
            </div>
            <p className="profile-daw-tag">
              DAW: <strong>{profile.primaryDaw}</strong> • Afinação: <strong>{profile.tuningStandard}</strong>
            </p>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="profile-stats-grid">
          <div className="profile-stat-box">
            <span className="stat-label">Licença</span>
            <strong className="stat-val text-green">100% Offline</strong>
          </div>
          <div className="profile-stat-box">
            <span className="stat-label">Gênero Favorito</span>
            <strong className="stat-val">
              {profile.favoriteGenre === "trap-br"
                ? "Trap BR"
                : profile.favoriteGenre === "trap-usa"
                ? "Trap USA"
                : profile.favoriteGenre === "trap-uk"
                ? "UK Drill"
                : "Boom Bap"}
            </strong>
          </div>
          <div className="profile-stat-box">
            <span className="stat-label">BPM Padrão</span>
            <strong className="stat-val">{profile.defaultBpm} BPM</strong>
          </div>
        </div>

        {/* EDIT FORM */}
        <div className="profile-form-section">
          <div className="form-section-title-row">
            <h4>Preferências de Produção</h4>
            {!isEditing ? (
              <button
                className="btn-edit-profile-toggle"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Editar
              </button>
            ) : (
              <button className="btn-save-profile" onClick={handleSave}>
                💾 Salvar Alterações
              </button>
            )}
          </div>

          {savedSuccess && (
            <div className="profile-save-alert">
              ✓ Preferências salvas com sucesso no seu dispositivo!
            </div>
          )}

          <div className="profile-fields-list">
            {/* PRODUCER NAME */}
            <div className="profile-field-group">
              <label>Nome Artístico / Alias:</label>
              {isEditing ? (
                <input
                  type="text"
                  className="profile-input"
                  value={profile.producerName}
                  onChange={(e) =>
                    setProfile({ ...profile, producerName: e.target.value })
                  }
                  placeholder="Ex: Prod. Gabriel"
                  maxLength={32}
                />
              ) : (
                <div className="field-value-static">{profile.producerName}</div>
              )}
            </div>

            {/* AVATAR SELECTOR */}
            {isEditing && (
              <div className="profile-field-group">
                <label>Ícone do Avatar:</label>
                <div className="avatar-picker-row">
                  {avatarOptions.map((icon) => (
                    <button
                      key={icon}
                      className={`avatar-choice ${
                        profile.avatarIcon === icon ? "active" : ""
                      }`}
                      onClick={() => setProfile({ ...profile, avatarIcon: icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PRIMARY DAW */}
            <div className="profile-field-group">
              <label>DAW Principal para Exportação:</label>
              {isEditing ? (
                <select
                  className="profile-select"
                  value={profile.primaryDaw}
                  onChange={(e) =>
                    setProfile({ ...profile, primaryDaw: e.target.value })
                  }
                >
                  <option value="FL Studio">FL Studio</option>
                  <option value="Ableton Live">Ableton Live</option>
                  <option value="Logic Pro">Logic Pro</option>
                  <option value="Reaper">Reaper</option>
                  <option value="Pro Tools">Pro Tools</option>
                  <option value="Studio One">Studio One</option>
                  <option value="Outro">Outra DAW</option>
                </select>
              ) : (
                <div className="field-value-static">{profile.primaryDaw}</div>
              )}
            </div>

            {/* FAVORITE GENRE */}
            <div className="profile-field-group">
              <label>Gênero Padrão:</label>
              {isEditing ? (
                <select
                  className="profile-select"
                  value={profile.favoriteGenre}
                  onChange={(e) =>
                    setProfile({ ...profile, favoriteGenre: e.target.value })
                  }
                >
                  <option value="trap-br">Trap Brasileiro (140 BPM)</option>
                  <option value="trap-usa">Trap USA / Dark (130 BPM)</option>
                  <option value="trap-uk">UK / NY Drill (142 BPM)</option>
                  <option value="boom-bap">Boom Bap / Hip-Hop (90 BPM)</option>
                  <option value="funk">Funk Brasileiro (130 BPM)</option>
                  <option value="amapiano">Amapiano (113 BPM)</option>
                </select>
              ) : (
                <div className="field-value-static">
                  {profile.favoriteGenre === "trap-br"
                    ? "Trap Brasileiro"
                    : profile.favoriteGenre === "trap-usa"
                    ? "Trap USA / Dark"
                    : profile.favoriteGenre === "trap-uk"
                    ? "UK / NY Drill"
                    : "Boom Bap / Hip-Hop"}
                </div>
              )}
            </div>

            {/* DEFAULT BPM */}
            <div className="profile-field-group">
              <label>BPM Inicial:</label>
              {isEditing ? (
                <input
                  type="number"
                  min={60}
                  max={200}
                  className="profile-input"
                  value={profile.defaultBpm}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      defaultBpm: Math.max(
                        40,
                        Math.min(300, parseInt(e.target.value) || 140)
                      ),
                    })
                  }
                />
              ) : (
                <div className="field-value-static">{profile.defaultBpm} BPM</div>
              )}
            </div>

            {/* TUNING STANDARD */}
            <div className="profile-field-group">
              <label>Afinação Padrão:</label>
              {isEditing ? (
                <select
                  className="profile-select"
                  value={profile.tuningStandard}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      tuningStandard: e.target.value as "440Hz" | "432Hz",
                    })
                  }
                >
                  <option value="440Hz">440Hz (Padrão Internacional)</option>
                  <option value="432Hz">432Hz (Afinação Harmônica Natural)</option>
                </select>
              ) : (
                <div className="field-value-static">{profile.tuningStandard}</div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="profile-footer">
          <div className="profile-footer-note">
            <span>🔒 Seus dados ficam salvos 100% no seu dispositivo local.</span>
          </div>
          <button className="btn-profile-close" onClick={onClose}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
