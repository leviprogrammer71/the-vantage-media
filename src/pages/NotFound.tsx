import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  return (
    <>
      <Helmet>
        <title>404 — The Vantage</title>
      </Helmet>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <h1
          className="text-8xl md:text-[12rem] font-bold text-primary leading-none"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          404
        </h1>
        <p className="text-xl font-semibold text-foreground mt-4 tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          PAGE NOT FOUND
        </p>
        <p className="text-sm text-muted-foreground mt-2 mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </div>
    </>
  );
};

export default NotFound;
