import { useMobileExperience as useMobileExperienceJs } from './useMobileExperience.js';
import type { UseMobileExperienceApi } from '../types/battle';

const useMobileExperienceTyped = useMobileExperienceJs as unknown as () => UseMobileExperienceApi;

export function useMobileExperience(): UseMobileExperienceApi {
  return useMobileExperienceTyped();
}
