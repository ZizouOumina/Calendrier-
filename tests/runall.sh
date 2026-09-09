#!/bin/bash
cd "$(dirname "$0")"
# le serveur sert t/batcave.html : resynchroniser AVANT la campagne,
# sinon on teste une copie périmée sans s'en apercevoir.
bash ./sync.sh
diff -q <(sed '/fonts\.googleapis\.com/d' ../batcave.html) ./batcave.html || { echo 'SYNC_FAIL' > /tmp/reg10.log; exit 1; }
# R16 : aucun test ne lit l'horloge de la machine — la date est toujours injectee
sans=$(for f in test*.mjs; do np=$(grep -c 'newPage()' "$f"); ci=$(grep -c 'clock.install' "$f"); [ "$np" -gt "$ci" ] && echo "$f($np pages/$ci horloges)"; done)
if [ -n "$sans" ]; then echo "TESTS SANS DATE INJECTEE: $sans" > /tmp/reg10.log; exit 1; fi
rm -f /tmp/reg10.log
for f in $(ls test*.mjs | sort -V); do
  echo "=== $f ===" >> /tmp/reg10.log
  node "$f" >> /tmp/reg10.log 2>&1
  echo "$f EXIT:$?" >> /tmp/reg10.log
done
echo "ALL_DONE" >> /tmp/reg10.log
