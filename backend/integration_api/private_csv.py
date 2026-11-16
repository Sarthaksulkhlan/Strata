"""Server-created temporary CSV exports; never deserialize uploaded executables."""
import tempfile
import threading


def safe_chunks(frame, size=4096):
    for start in range(0, len(frame), size):
        part = frame.iloc[start:start + size].copy()
        for column in part.select_dtypes('object'):
            part[column] = part[column].map(
                lambda value: "'" + value if isinstance(value, str)
                and value.lstrip().startswith(('=', '+', '-', '@')) else value)
        yield part.to_csv(index=False, header=start == 0)
    if frame.empty:
        yield frame.to_csv(index=False)


class PrivateCsv:
    """Owned by a job or in-flight export; closes when its last owner is released."""
    def __init__(self, frame):
        self._file = tempfile.TemporaryFile(mode='w+b')
        self._lock = threading.Lock()
        try:
            for chunk in safe_chunks(frame):
                self._file.write(chunk.encode('utf-8'))
            self._file.flush()
        except BaseException:
            self._file.close()
            raise

    def chunks(self):
        # Each iterator owns a reference until completion/disconnect. Job expiry
        # cannot close a file mid-download; concurrent readers cannot mix offsets.
        with self._lock:
            self._file.seek(0)
            while chunk := self._file.read(65536):
                yield chunk

    def __del__(self):
        if hasattr(self, '_file'):
            self._file.close()
