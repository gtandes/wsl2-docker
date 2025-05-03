#!/bin/bash

echo "⏳ Updating fork..."
echo "   1. Make sure you review the changes before committing them, conflicts may occur."
echo "   2. When reviewing changes, carefully accept incoming changes, or manually merge them with local ones."
echo "   3. In case of conflict you can abort the merge with 'git merge --abort'"
echo ""

git remote remove ger-boiler &> /dev/null
git remote add ger-boiler git@bitbucket.org:germinate/germinate-boilerplate-turborepo.git
git pull ger-boiler master --ff
git remote remove ger-boiler
