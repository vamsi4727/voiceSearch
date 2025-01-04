import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SearchHeader = ({ searchQuery }) => {
  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-medium text-gray-900 truncate">
              {searchQuery ? `Search results for: "${searchQuery}"` : 'Ready to search'}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchHeader;