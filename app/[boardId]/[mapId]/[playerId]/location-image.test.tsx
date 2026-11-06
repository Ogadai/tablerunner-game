import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import LocationImage from './location-image';
import { getLocationImageUrl } from '@/lib/services/location-image-urls';

describe('LocationImage component', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const renderComponent = async (ui: React.ReactElement) => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(ui);
    });
    return result!;
  };

  it('renders direct image url immediately on mount without calling fetch', async () => {
    await renderComponent(<LocationImage locationId={1} description="A sunny clearing" />);

    expect(global.fetch).not.toHaveBeenCalled();

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', getLocationImageUrl(1));
    expect(img).toHaveAttribute('alt', 'A sunny clearing');
    expect(screen.getByText('A sunny clearing')).toBeInTheDocument();
    expect(screen.queryByTestId('location-image-placeholder')).not.toBeInTheDocument();
  });

  it('switches to generate-then-load and shows placeholder when direct image fails', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as any;

    await renderComponent(<LocationImage locationId={1} description="A dark cavern" />);

    const directImg = screen.getByRole('img');
    fireEvent.error(directImg);

    expect(global.fetch).toHaveBeenCalledWith('/api/locations/1/image', {
      cache: 'no-store',
    });
    expect(screen.getByTestId('location-image-placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('A dark cavern')).toBeInTheDocument();
  });

  it('renders generated image when direct image fails and generate API succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://cdn.example.com/generated-1.png' }),
    });

    await renderComponent(<LocationImage locationId={1} description="A sunny clearing" />);

    const directImg = screen.getByRole('img');
    fireEvent.error(directImg);

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    const generatedImg = screen.getByRole('img');
    expect(generatedImg).toHaveAttribute('src', 'https://cdn.example.com/generated-1.png');
    expect(generatedImg).toHaveAttribute('alt', 'A sunny clearing');
    expect(screen.queryByTestId('location-image-placeholder')).not.toBeInTheDocument();
    expect(screen.getByText('A sunny clearing')).toBeInTheDocument();
  });

  it('falls back to description if generate API returns an error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await renderComponent(<LocationImage locationId={1} description="A rocky path" />);

    const directImg = screen.getByRole('img');
    fireEvent.error(directImg);

    await waitFor(() => {
      expect(screen.queryByTestId('location-image-placeholder')).not.toBeInTheDocument();
    });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('A rocky path')).toBeInTheDocument();
  });

  it('falls back to description if generated image triggers onError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://cdn.example.com/broken.png' }),
    });

    await renderComponent(<LocationImage locationId={1} description="A haunted crypt" />);

    const directImg = screen.getByRole('img');
    fireEvent.error(directImg);

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    const generatedImg = screen.getByRole('img');
    fireEvent.error(generatedImg);

    await waitFor(() => {
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    expect(screen.queryByTestId('location-image-placeholder')).not.toBeInTheDocument();
    expect(screen.getByText('A haunted crypt')).toBeInTheDocument();
  });

  it('resets to direct image when locationId changes', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as any;

    const { rerender } = await renderComponent(
      <LocationImage locationId={1} description="Location One" />
    );

    const directImg1 = screen.getByRole('img');
    expect(directImg1).toHaveAttribute('src', getLocationImageUrl(1));

    // Simulate error to transition to generating
    fireEvent.error(directImg1);
    expect(screen.getByTestId('location-image-placeholder')).toBeInTheDocument();

    // Rerender with locationId 2
    await act(async () => {
      rerender(<LocationImage locationId={2} description="Location Two" />);
    });

    const directImg2 = screen.getByRole('img');
    expect(directImg2).toHaveAttribute('src', getLocationImageUrl(2));
    expect(screen.queryByTestId('location-image-placeholder')).not.toBeInTheDocument();
    expect(screen.getByText('Location Two')).toBeInTheDocument();
  });

  it('renders only description when locationId is invalid or non-positive', async () => {
    await renderComponent(<LocationImage locationId={0} description="Invalid Location" />);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByTestId('location-image-placeholder')).not.toBeInTheDocument();
    expect(screen.getByText('Invalid Location')).toBeInTheDocument();
  });
});
