import axios from './axios_config';
import { apiRoutes } from './apiRoutes';

interface EudPage {
  results: { uid: string; callsign: string | null }[];
  total_pages: number;
}

// /api/eud always returns a paginated object; it has no `all` array mode.
export async function getEudChoices() {
  const choices: { value: string; label: string }[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await axios.get<EudPage>(apiRoutes.eud, {
      params: { page, per_page: 100 },
    });
    choices.push(
      ...response.data.results.map((eud) => ({
        value: eud.uid,
        label: eud.callsign || eud.uid,
      }))
    );
    totalPages = response.data.total_pages;
    page += 1;
  } while (page <= totalPages);
  return choices;
}
