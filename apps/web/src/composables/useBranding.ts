import { ref, watch, type Ref } from 'vue';
import { apiGet } from '../api/client';

export interface Branding {
  name: string;
  logoUrl: string | null;
  logoAlt: string;
}

const NEUTRAL: Branding = { name: 'AI_TPI', logoUrl: null, logoAlt: 'AI_TPI' };

/** Lädt das Firmenbranding für /login/<kürzel> (R-01); bei Fehlern neutrales Branding. */
export function useBranding(slug: Ref<string | undefined>) {
  const branding = ref<Branding>(NEUTRAL);
  watch(
    slug,
    async (s) => {
      const res = await apiGet<Branding>(
        s ? `/public/branding/${encodeURIComponent(s)}` : '/public/branding',
      );
      branding.value = res.ok && res.data ? res.data : NEUTRAL;
    },
    { immediate: true },
  );
  return branding;
}
