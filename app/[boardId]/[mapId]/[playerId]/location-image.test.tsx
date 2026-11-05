import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import LocationImage from './location-image';

describe('LocationImage component', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const renderComponent = async (ui: React.ReactElement) => {
    await act(async () => {
      render(ui);
    });
  };

  it('renders fallback description while loading', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as any;

    await renderComponent(<LocationImage locationId={1} description="A dark cavern" />);

    expect(screen.getByText('A dark cavern')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders fallback description if API returns an error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await renderComponent(<LocationImage locationId={1} description="A rocky path" />);

    await waitFor(() => {
      expect(screen.getByText('A rocky path')).toBeInTheDocument();
    });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders image when fetch succeeds and image loads', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://blob.vercel-storage.com/loc-1.png' }),
    });

    await renderComponent(<LocationImage locationId={1} description="A sunny clearing" />);

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://blob.vercel-storage.com/loc-1.png');
    expect(img).toHaveAttribute('alt', 'A sunny clearing');
    expect(img).toBeVisible();
    expect(screen.getByText('A sunny clearing')).toBeInTheDocument();
  });

  it('falls back to description if image triggers onError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://blob.vercel-storage.com/broken.png' }),
    });

    await renderComponent(<LocationImage locationId={1} description="A haunted crypt" />);

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    const img = screen.getByRole('img');
    fireEvent.error(img);

    await waitFor(() => {
      expect(screen.getByText('A haunted crypt')).toBeInTheDocument();
    });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByTestId('location-image-placeholder')).not.toBeInTheDocument();
  });

  it('renders placeholder in suspense while waiting for image to load', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as any;

    await renderComponent(<LocationImage locationId={1} description="A dark cavern" />);

    expect(screen.getByTestId('location-image-placeholder')).toBeInTheDocument();
    expect(screen.getByText('A dark cavern')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

