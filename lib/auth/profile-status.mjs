/** Only an explicit database boolean true represents an active profile. */
export function isActiveProfile(profile) {
  return profile?.aktif === true;
}
