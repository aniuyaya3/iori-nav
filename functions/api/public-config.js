// functions/api/public-config.js
import { jsonResponse } from '../_middleware';

/**
 * @summary Get public configuration settings
 * @route GET /api/public-config
 * @returns {Response} JSON response with public settings
 */
export async function onRequestGet({ env }) {
  // Check the environment variable. Convert to string to handle both boolean `true` from toml and string 'true' from secrets
  const submissionEnabled = String(env.ENABLE_PUBLIC_SUBMISSION) === 'true';
  
  return jsonResponse({
    submissionEnabled: submissionEnabled
  });
}