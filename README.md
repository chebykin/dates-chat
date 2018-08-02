dates-chat
=================

# dating website chat app

## Redis keys:

1. `user_profiles` - hash.
2. `chat:session:store` - hash.
3. `recent_users:#{user_id}` - sorted set.
4. `chat_settings:#{user_id}` - hash.
5. `webcams:#{collection_name}` - hash.
6. `dialogs:#{man_id}_#{woman_id}` - list.
