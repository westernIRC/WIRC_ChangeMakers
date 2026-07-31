import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-gray-600">
        That link doesn't lead anywhere. It may have moved, or the address might have a typo.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
      >
        Back to home
      </Link>
    </div>
  );
}
