import { Upload } from 'tus-js-client';
import { renderHook, act } from '@testing-library/react-hooks';
import { cleanup } from '@testing-library/react';
import { TusClientProvider } from '../TusClientProvider';
import { useTus } from '../useTus';
import { getBlob } from './utils/getBlob';
import { ERROR_MESSAGES } from '../core/constants';
import { useTusClientDispatch, useTusClientState } from '../core/tusContexts';
import { createConsoleErrorMock, insertEnvValue } from './utils/mock';

/* eslint-disable no-console */

const getDefaultOptions: () => Upload['options'] = () => ({
  endpoint: 'http://tus.io/uploads',
  uploadUrl: 'http://tus.io/files/upload',
  metadata: {
    filetype: 'text/plain',
  },
});

const originProcess = process;
const actualTus = jest.requireActual<typeof import('tus-js-client')>(
  'tus-js-client'
);

describe('useTus', () => {
  beforeEach(() => {
    window.process = originProcess;
  });

  it('Should generate tus instance if cacheKey is not undefined', async () => {
    await act(async () => {
      const { result, waitForNextUpdate, rerender } = renderHook(
        ({ cacheKey }: { cacheKey: string }) => useTus(cacheKey),
        {
          initialProps: { cacheKey: 'test1' },
          wrapper: ({ children }) => (
            <TusClientProvider>{children}</TusClientProvider>
          ),
        }
      );

      const file: Upload['file'] = getBlob('hello');
      const options: Upload['options'] = getDefaultOptions();

      expect(result.current.upload).toBeUndefined();
      expect(result.current.isSuccess).toBeFalsy();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');

      result.current.setUpload(file, options);
      await waitForNextUpdate();

      expect(result.current.upload).toBeInstanceOf(Upload);
      expect(result.current.isSuccess).toBeFalsy();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');

      rerender({ cacheKey: 'test2' });
      expect(result.current.upload).toBeUndefined();
      expect(result.current.isSuccess).toBeFalsy();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');

      rerender({ cacheKey: 'test1' });
      expect(result.current.upload).toBeInstanceOf(Upload);
      expect(result.current.isSuccess).toBeFalsy();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');

      result.current.remove();
      expect(result.current.upload).toBeUndefined();
      expect(result.current.isSuccess).toBeFalsy();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');
    });
  });

  it('Should generate tus instance if cacheKey is undefined', async () => {
    await act(async () => {
      const { result, waitForNextUpdate, rerender } = renderHook(
        ({ cacheKey }: { cacheKey: string }) => {
          const tus = useTus(cacheKey);
          const tusClientState = useTusClientState();

          return { tus, tusClientState };
        },
        {
          initialProps: { cacheKey: '' },
          wrapper: ({ children }) => (
            <TusClientProvider>{children}</TusClientProvider>
          ),
        }
      );

      const file: Upload['file'] = getBlob('hello');
      const options: Upload['options'] = getDefaultOptions();

      expect(result.current.tus.upload).toBeUndefined();
      expect(result.current.tus.isSuccess).toBeFalsy();
      expect(result.current.tus.error).toBeUndefined();
      expect(typeof result.current.tus.setUpload).toBe('function');
      expect(typeof result.current.tus.remove).toBe('function');

      result.current.tus.setUpload(file, options);
      await waitForNextUpdate();

      const randomUploadKey = Object.keys(
        result.current.tusClientState.uploads
      )[0];
      const randomUploadState =
        result.current.tusClientState.uploads[randomUploadKey];

      expect(result.current.tus.upload).toBeInstanceOf(Upload);
      expect(result.current.tus.isSuccess).toBeFalsy();
      expect(result.current.tus.error).toBeUndefined();
      expect(Object.keys(result.current.tusClientState.uploads).length).toBe(1);
      expect(result.current.tusClientState.uploads[randomUploadKey]).toEqual(
        randomUploadState
      );
      expect(typeof randomUploadKey).not.toBeUndefined();
      expect(typeof result.current.tus.setUpload).toBe('function');
      expect(typeof result.current.tus.remove).toBe('function');

      rerender({ cacheKey: 'test1' });

      expect(result.current.tus.upload).toBeUndefined();
      expect(result.current.tus.isSuccess).toBeFalsy();
      expect(result.current.tus.error).toBeUndefined();
      expect(Object.keys(result.current.tusClientState.uploads).length).toBe(1);
      expect(result.current.tusClientState.uploads[randomUploadKey]).toEqual(
        randomUploadState
      );
      expect(typeof result.current.tus.setUpload).toBe('function');
      expect(typeof result.current.tus.remove).toBe('function');

      result.current.tus.setUpload(file, options);

      expect(result.current.tus.upload).toBeInstanceOf(Upload);
      expect(result.current.tus.isSuccess).toBeFalsy();
      expect(result.current.tus.error).toBeUndefined();
      expect(Object.keys(result.current.tusClientState.uploads).length).toBe(2);
      expect(result.current.tusClientState.uploads[randomUploadKey]).toEqual(
        randomUploadState
      );
      expect(typeof result.current.tus.setUpload).toBe('function');
      expect(typeof result.current.tus.remove).toBe('function');

      rerender({ cacheKey: randomUploadKey });

      expect(result.current.tus.upload).toEqual(randomUploadState?.upload);
      expect(result.current.tus.isSuccess).toBeFalsy();
      expect(result.current.tus.error).toBeUndefined();
      expect(Object.keys(result.current.tusClientState.uploads).length).toBe(2);
      expect(result.current.tusClientState.uploads[randomUploadKey]).toEqual(
        randomUploadState
      );
      expect(typeof result.current.tus.setUpload).toBe('function');
      expect(typeof result.current.tus.remove).toBe('function');
    });
  });

  it('Should be reflected onto the TusClientProvider', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        ({ cacheKey }: { cacheKey: string }) => {
          const tus = useTus(cacheKey);
          const tusClientState = useTusClientState();

          return { tus, tusClientState };
        },
        {
          initialProps: { cacheKey: 'test' },
          wrapper: ({ children }) => (
            <TusClientProvider>{children}</TusClientProvider>
          ),
        }
      );

      const file: Upload['file'] = getBlob('hello');
      const options: Upload['options'] = {
        ...getDefaultOptions(),
      };

      result.current.tus.setUpload(file, options);
      await waitForNextUpdate();
      expect(result.current.tus.upload).toBeInstanceOf(Upload);

      await result.current.tus.upload?.abort(true);

      const pastTusClientState = result.all.find((_, i) => i === 0);
      expect(pastTusClientState).not.toBeUndefined();
      expect(pastTusClientState).not.toEqual(result.current.tusClientState);
    });
  });

  it('Should setUpload without option args', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useTus(), {
        wrapper: ({ children }) => (
          <TusClientProvider defaultOptions={{ endpoint: 'hoge' }}>
            {children}
          </TusClientProvider>
        ),
      });

      result.current.setUpload(getBlob('hello'));
      await waitForNextUpdate();

      expect(result.current.upload?.options.endpoint).toBe('hoge');
    });
  });

  describe('Should throw if the TusClientProvider has not found on development env', () => {
    beforeEach(() => {
      insertEnvValue({ NODE_ENV: 'development' });
    });

    it('useTus', async () => {
      const { result } = renderHook(() => useTus(''));
      expect(result.error).toEqual(
        Error(ERROR_MESSAGES.tusClientHasNotFounded)
      );
    });

    it('useTusClientState', async () => {
      const { result } = renderHook(() => useTusClientState());
      expect(result.error).toEqual(
        Error(ERROR_MESSAGES.tusClientHasNotFounded)
      );
    });

    it('useTusClientDispatch', async () => {
      const { result } = renderHook(() => useTusClientDispatch());
      expect(result.error).toEqual(
        Error(ERROR_MESSAGES.tusClientHasNotFounded)
      );
    });
  });

  describe('Should not throw even if the TusClientProvider has not found on production env', () => {
    beforeEach(() => {
      insertEnvValue({ NODE_ENV: 'production' });
    });

    it('useTus', async () => {
      const { result } = renderHook(() => useTus(''));
      expect(result.error).toBeInstanceOf(TypeError);
    });

    it('useTusClientState', async () => {
      const { result } = renderHook(() => useTusClientState());
      expect(result.error).toEqual(undefined);
    });

    it('useTusClientDispatch', async () => {
      const { result } = renderHook(() => useTusClientDispatch());
      expect(result.error).toEqual(undefined);
    });
  });

  it('Should set tus config from context value', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        ({ cacheKey }: { cacheKey: string }) => {
          const tus = useTus(cacheKey);
          const tusClientState = useTusClientState();

          return { tus, tusClientState };
        },
        {
          initialProps: { cacheKey: 'test' },
          wrapper: ({ children }) => (
            <TusClientProvider
              canStoreURLs={false}
              defaultOptions={{ endpoint: 'hoge' }}
            >
              {children}
            </TusClientProvider>
          ),
        }
      );

      expect(result.current.tusClientState.tusHandler.getTus.canStoreURLs).toBe(
        false
      );
      expect(result.current.tusClientState.tusHandler.getTus.isSupported).toBe(
        actualTus.isSupported
      );
      expect(result.current.tusClientState.tusHandler.getTus.Upload).toBe(
        actualTus.Upload
      );
      expect(
        result.current.tusClientState.tusHandler.getTus.defaultOptions.endpoint
      ).toBe('hoge');

      const file: Upload['file'] = getBlob('hello');

      act(() => {
        result.current.tus.setUpload(file, {});
      });

      await waitForNextUpdate();

      expect(result.current.tus.upload).toBeInstanceOf(actualTus.Upload);
      expect(result.current.tus.upload?.options.endpoint).toBe('hoge');
    });
  });

  it('Should change isSuccess state on success', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        ({ cacheKey }: { cacheKey: string }) => useTus(cacheKey),
        {
          initialProps: { cacheKey: 'test' },
          wrapper: ({ children }) => (
            <TusClientProvider>{children}</TusClientProvider>
          ),
        }
      );

      expect(result.current.upload).toBeUndefined();
      expect(result.current.isSuccess).toBeFalsy();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');

      const consoleErrorMock = createConsoleErrorMock();
      result.current.setUpload(getBlob('hello'), {
        ...getDefaultOptions(),
        onSuccess: () => {
          console.error();
        },
      });
      await waitForNextUpdate();

      expect(result.current.upload).toBeInstanceOf(Upload);
      expect(result.current.isSuccess).toBeFalsy();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');

      const onSuccess = result.current.upload?.options?.onSuccess;
      if (!onSuccess) {
        throw new Error('onSuccess is falsly.');
      }

      onSuccess();

      expect(result.current.upload).toBeInstanceOf(Upload);
      expect(result.current.isSuccess).toBeTruthy();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');
      expect(consoleErrorMock).toHaveBeenCalledWith();
    });
  });

  it('Should change error state on error', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        ({ cacheKey }: { cacheKey: string }) => useTus(cacheKey),
        {
          initialProps: { cacheKey: 'test' },
          wrapper: ({ children }) => (
            <TusClientProvider>{children}</TusClientProvider>
          ),
        }
      );

      expect(result.current.upload).toBeUndefined();
      expect(result.current.isSuccess).toBeFalsy();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');

      const consoleErrorMock = createConsoleErrorMock();
      result.current.setUpload(getBlob('hello'), {
        ...getDefaultOptions(),
        onError: () => {
          console.error();
        },
      });
      await waitForNextUpdate();

      expect(result.current.upload).toBeInstanceOf(Upload);
      expect(result.current.isSuccess).toBeFalsy();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');

      const onError = result.current.upload?.options?.onError;
      if (!onError) {
        throw new Error('onError is falsly.');
      }

      onError(new Error());

      expect(result.current.upload).toBeInstanceOf(Upload);
      expect(result.current.isSuccess).toBeFalsy();
      expect(result.current.error).toEqual(new Error());
      expect(typeof result.current.setUpload).toBe('function');
      expect(typeof result.current.remove).toBe('function');
      expect(consoleErrorMock).toHaveBeenCalledWith();
    });
  });
});
