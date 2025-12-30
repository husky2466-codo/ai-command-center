import { FILTERS, EMAILS_PER_PAGE } from '../utils/emailConstants';

/**
 * Hook for email filtering and pagination logic
 */
export function useEmailFilters(emails, filter, searchQuery, activeSearchQuery, emailsPerPage = EMAILS_PER_PAGE, currentPage = 1) {
  // Ensure emails is an array
  const emailsArray = Array.isArray(emails) ? emails : [];

  // Filter emails
  const filteredEmails = activeSearchQuery
    ? emailsArray
    : emailsArray.filter(email => {
        if (filter === FILTERS.UNREAD && !email.unread) return false;
        if (filter === FILTERS.STARRED && !email.starred) return false;

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            email.subject?.toLowerCase().includes(query) ||
            email.from?.toLowerCase().includes(query) ||
            email.snippet?.toLowerCase().includes(query)
          );
        }

        return true;
      });

  // Paginate emails
  const totalPages = Math.ceil(filteredEmails.length / emailsPerPage);
  const startIndex = (currentPage - 1) * emailsPerPage;
  const paginatedEmails = filteredEmails.slice(startIndex, startIndex + emailsPerPage);

  return {
    filteredEmails,
    paginatedEmails,
    totalPages,
    startIndex
  };
}
