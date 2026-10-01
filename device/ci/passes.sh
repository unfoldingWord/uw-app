pass_tags() {
  case "$1" in
    main) echo "--exclude-tags=optional,large-text" ;;
    optional) echo "--include-tags=optional" ;;
    large-text) echo "--include-tags=large-text" ;;
    *)
      echo "unknown pass $1; expected main, optional or large-text" >&2
      return 1
      ;;
  esac
}
